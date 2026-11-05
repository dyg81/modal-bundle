<?php

namespace Dyg81\ModalBundle\Tests\Unit\Response;

use Dyg81\ModalBundle\Response\ModalRedirectResponse;
use PHPUnit\Framework\TestCase;

class ModalRedirectResponseTest extends TestCase
{
    public function testConstructorEncodesRedirectUrl()
    {
        $response = new ModalRedirectResponse('/success');

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['redirect' => '/success'], json_decode($response->getContent(), true));
    }

    public function testConstructorAcceptsStatusAndHeaders()
    {
        $response = new ModalRedirectResponse('/done', 201, ['X-Test' => 'yes']);

        $this->assertSame(201, $response->getStatusCode());
        $this->assertSame('yes', $response->headers->get('X-Test'));
    }

    public function testCreateBuildsResponseFromProtocolArray()
    {
        $response = ModalRedirectResponse::create(['redirect' => '/home']);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['redirect' => '/home'], json_decode($response->getContent(), true));
    }

    public function testFromJsonStringParsesValidPayload()
    {
        $response = ModalRedirectResponse::fromJsonString('{"redirect":"/home"}', 202);

        $this->assertSame(202, $response->getStatusCode());
        $this->assertSame(['redirect' => '/home'], json_decode($response->getContent(), true));
    }

    public function testSetDataRejectsMissingRedirect()
    {
        $this->expectException(\InvalidArgumentException::class);

        $response = new ModalRedirectResponse('/success');
        $response->setData([]);
    }

    public function testCreateRejectsInvalidProtocol()
    {
        $this->expectException(\InvalidArgumentException::class);

        ModalRedirectResponse::create(['modal' => '<div></div>']);
    }

    public function testFromJsonStringRejectsInvalidJson()
    {
        $this->expectException(\InvalidArgumentException::class);

        ModalRedirectResponse::fromJsonString('not json');
    }
}
