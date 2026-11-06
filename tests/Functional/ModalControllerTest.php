<?php

namespace Dyg81\ModalBundle\Tests\Functional;

use Dyg81\ModalBundle\Tests\Fixtures\app\AppKernel;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ModalControllerTest extends WebTestCase
{
    protected static function getKernelClass()
    {
        return AppKernel::class;
    }

    public function testOpenMessageModalTranslatesKnownKey()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/open?key=modal.message.confirm.body');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorExists('.modal');
        $this->assertSelectorTextContains('.modal-body', 'Are you sure you want to perform this action?');
    }

    public function testOpenMessageModalHasAccessibleTitle()
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/modal/open?key=modal.message.info.title');

        $this->assertResponseIsSuccessful();

        $modal = $crawler->filter('div.modal')->first();
        $title = $crawler->filter('.modal-title')->first();

        $this->assertSame('Information', trim($title->text()));
        $this->assertSame($title->attr('id'), $modal->attr('aria-labelledby'));
        $this->assertSame('true', $modal->attr('aria-modal'));
    }

    public function testOpenConfirmModalReturnsModal()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/confirm');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorExists('.modal');
    }

    public function testOpenConfirmModalHasAccessibleTitle()
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/modal/confirm');

        $this->assertResponseIsSuccessful();

        $modal = $crawler->filter('div.modal')->first();
        $title = $crawler->filter('.modal-title')->first();

        $this->assertSame('Confirm action', trim($title->text()));
        $this->assertSame($title->attr('id'), $modal->attr('aria-labelledby'));
        $this->assertSame('true', $modal->attr('aria-modal'));
    }

    public function testMessageModalRejectsPost()
    {
        $client = static::createClient();
        $client->request('POST', '/modal/open?key=modal.message.confirm.body');

        $this->assertResponseStatusCodeSame(405);
    }

    public function testMessageModalReturns404ForMissingKey()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/open');

        $this->assertResponseStatusCodeSame(404);
    }

    public function testMessageModalReturns404ForEmptyKey()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/open?key=');

        $this->assertResponseStatusCodeSame(404);
    }

    public function testMessageModalReturns404ForUnknownKey()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/open?key=modal.does.not.exist');

        $this->assertResponseStatusCodeSame(404);
    }
}
